"use client";

import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  FileText,
  Calendar,
  User,
  Download,
  ExternalLink,
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase, type Proposal, type Template } from "@/lib/supabase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [newProposalTitle, setNewProposalTitle] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const [{ data: proposalsData }, { data: templatesData }] = await Promise.all([
      supabase.from("proposals").select("*, template:templates(*)").order("created_at", { ascending: false }),
      supabase.from("templates").select("*").order("name"),
    ]);
    setProposals(proposalsData || []);
    setTemplates(templatesData || []);
    setLoading(false);
  }

  async function deleteProposal(id: string) {
    const { error } = await supabase.from("proposals").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete proposal");
    } else {
      toast.success("Proposal deleted");
      fetchData();
    }
  }

  async function createProposal() {
    if (!selectedTemplate || !newProposalTitle) {
      toast.error("Please select a template and enter a title");
      return;
    }

    const template = templates.find((t) => t.id === selectedTemplate);
    if (!template) return;

    const placeholdersSchema = typeof template.placeholders_schema === 'string' 
      ? JSON.parse(template.placeholders_schema) 
      : template.placeholders_schema || [];
    const contentData = typeof template.content === 'string' 
      ? JSON.parse(template.content) 
      : template.content;
    const visualPlaceholders = typeof template.visual_placeholders === 'string' 
      ? JSON.parse(template.visual_placeholders) 
      : template.visual_placeholders;

    const defaultData: Record<string, unknown> = {};
    placeholdersSchema.forEach((field: { key: string; defaultValue?: unknown }) => {
      if (field.defaultValue !== undefined) {
        defaultData[field.key] = field.defaultValue;
      }
    });

    const { data, error } = await supabase
      .from("proposals")
      .insert({
        title: newProposalTitle,
        template_id: selectedTemplate,
        content: contentData,
        visual_placeholders: visualPlaceholders,
        filled_data: defaultData,
        status: "draft",
        created_by: "user",
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create proposal");
    } else {
      toast.success("Proposal created");
      setShowNewDialog(false);
      setSelectedTemplate("");
      setNewProposalTitle("");
      window.location.href = `/proposals/${data.id}`;
    }
  }

  const filteredProposals = proposals.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.client_name?.toLowerCase() || "").includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusColors: Record<string, string> = {
    draft: "bg-amber-100 text-amber-700",
    review: "bg-blue-100 text-blue-700",
    approved: "bg-emerald-100 text-emerald-700",
    finalized: "bg-violet-100 text-violet-700",
  };

  return (
    <AppShell>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Proposals</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage your business proposals
            </p>
          </div>
          <Button className="gap-2" onClick={() => setShowNewDialog(true)}>
            <Plus className="h-4 w-4" />
            New Proposal
          </Button>
        </div>

        <Card className="border-0 shadow-sm mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search proposals..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="finalized">Finalized</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="h-40 bg-muted animate-pulse rounded-lg" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProposals.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProposals.map((proposal) => (
              <Card
                key={proposal.id}
                className="border-0 shadow-sm hover:shadow-md transition-shadow"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-1">
                        {proposal.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-1 mt-1">
                        {proposal.client_name || "No client"}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/proposals/${proposal.id}`}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/proposals/${proposal.id}`} target="_blank">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Open & Export PDF
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => deleteProposal(proposal.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {proposal.template && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        {proposal.template.name}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {new Date(proposal.created_at).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      Version {proposal.version}
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <Badge className={statusColors[proposal.status]}>
                        {proposal.status}
                      </Badge>
                      <Link href={`/proposals/${proposal.id}`}>
                        <Button size="sm" variant="outline">
                          Open
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-0 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-1">No proposals found</h3>
              <p className="text-muted-foreground text-sm mb-4">
                {search || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Get started by creating your first proposal"}
              </p>
              <Button className="gap-2" onClick={() => setShowNewDialog(true)}>
                <Plus className="h-4 w-4" />
                Create Proposal
              </Button>
            </CardContent>
          </Card>
        )}

        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Proposal</DialogTitle>
              <DialogDescription>
                Select a template and enter a title for your new proposal
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Proposal Title</label>
                <Input
                  placeholder="e.g., Q1 Software Project for Acme Corp"
                  value={newProposalTitle}
                  onChange={(e) => setNewProposalTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Template</label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewDialog(false)}>
                Cancel
              </Button>
              <Button onClick={createProposal} disabled={!selectedTemplate || !newProposalTitle}>
                Create Proposal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
