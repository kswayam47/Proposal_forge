"use client";

import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase, type Template } from "@/lib/supabase";
import { extractHeadings } from "@/lib/template-generator";
import { toast } from "sonner";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  FileText,
  Eye,
  Settings,
  Loader2,
  Play,
  CheckCircle,
  LayoutGrid,
} from "lucide-react";

export default function TemplateEditPage() {
  const params = useParams();
  const router = useRouter();
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchTemplate() {
      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error) {
        toast.error("Template not found");
        router.push("/templates");
      } else {
        const parsed = {
          ...data,
          content: typeof data.content === 'string' ? JSON.parse(data.content) : data.content,
          placeholders_schema: typeof data.placeholders_schema === 'string' ? JSON.parse(data.placeholders_schema) : data.placeholders_schema,
          visual_placeholders: typeof data.visual_placeholders === 'string' ? JSON.parse(data.visual_placeholders) : data.visual_placeholders,
          fixed_sections: typeof data.fixed_sections === 'string' ? JSON.parse(data.fixed_sections) : data.fixed_sections,
        };
        setTemplate(parsed);
      }
      setLoading(false);
    }
    fetchTemplate();
  }, [params.id, router]);

  const handleSave = async () => {
    if (!template) return;
    setSaving(true);

    const { error } = await supabase
      .from("templates")
      .update({
        name: template.name,
        description: template.description,
        status: template.status,
        fixed_sections: template.fixed_sections,
        updated_at: new Date().toISOString(),
      })
      .eq("id", template.id);

    if (error) {
      toast.error("Failed to save template");
    } else {
      toast.success("Template saved");
    }
    setSaving(false);
  };

  const handleStatusChange = async (status: string) => {
    if (!template) return;
    setTemplate({ ...template, status: status as Template["status"] });

    const { error } = await supabase
      .from("templates")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", template.id);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success(`Status updated to ${status}`);
    }
  };

  const headings = template?.content && Array.isArray(template.content) ? extractHeadings(template.content) : [];

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (!template) return null;

  return (
    <AppShell>
      <div className="flex h-full">
        <div className="w-64 border-r bg-card p-4 hidden lg:block">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Outline
          </h3>
          <ScrollArea className="h-[calc(100vh-200px)]">
            <nav className="space-y-1">
              {headings.map((heading, index) => (
                <button
                  key={heading.id}
                  className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors truncate"
                >
                  {index + 1}. {heading.title}
                </button>
              ))}
            </nav>
          </ScrollArea>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="p-6 border-b bg-card sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/templates">
                  <Button variant="ghost" size="icon">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div>
                  <Input
                    value={template.name}
                    onChange={(e) =>
                      setTemplate({ ...template, name: e.target.value })
                    }
                    className="text-xl font-bold border-0 p-0 h-auto focus-visible:ring-0 bg-transparent"
                  />
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary">{template.proposal_type}</Badge>
                    <Badge
                      className={
                        template.status === "published"
                          ? "bg-violet-100 text-violet-700"
                          : template.status === "approved"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }
                    >
                      {template.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Select value={template.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
                <Link href={`/proposals/new?template=${template.id}`}>
                  <Button variant="outline" className="gap-2">
                    <Play className="h-4 w-4" />
                    Use Template
                  </Button>
                </Link>
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save
                </Button>
              </div>
            </div>
          </div>

          <div className="p-6">
            <Tabs defaultValue="preview">
              <TabsList className="mb-6">
                <TabsTrigger value="preview" className="gap-2">
                  <Eye className="h-4 w-4" />
                  Preview
                </TabsTrigger>
                <TabsTrigger value="placeholders" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Placeholders
                </TabsTrigger>
                <TabsTrigger value="fixed" className="gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  Fixed Sections
                </TabsTrigger>
              </TabsList>

              <TabsContent value="preview">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-8 proposal-content">
                    {template.content.map((block) => {
                      if (block.type === "heading") {
                        return (
                          <h2
                            key={block.id}
                            id={block.id}
                            className="text-2xl font-bold mt-8 mb-4 first:mt-0"
                          >
                            {block.content}
                          </h2>
                        );
                      }
                      if (block.type === "paragraph") {
                        return (
                          <div
                            key={block.id}
                            className="mb-4 whitespace-pre-wrap"
                          >
                            {block.content.split("\n").map((line, i) => (
                              <p key={i} className="mb-2">
                                {line.includes("{{") ? (
                                  <>
                                    {line.split(/(\{\{[^}]+\}\})/).map((part, j) =>
                                      part.startsWith("{{") ? (
                                        <span
                                          key={j}
                                          className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-sm font-mono"
                                        >
                                          {part}
                                        </span>
                                      ) : (
                                        part
                                      )
                                    )}
                                  </>
                                ) : line.startsWith("**") && line.endsWith("**") ? (
                                  <strong>{line.slice(2, -2)}</strong>
                                ) : line.startsWith("#") ? (
                                  <span className="text-xl font-semibold">
                                    {line.replace(/^#+\s*/, "")}
                                  </span>
                                ) : (
                                  line
                                )}
                              </p>
                            ))}
                          </div>
                        );
                      }
                      if (block.type === "table") {
                        return (
                          <div
                            key={block.id}
                            className="mb-4 p-4 border-2 border-dashed rounded-lg bg-muted/50"
                          >
                            <p className="text-sm text-muted-foreground">
                              Table: {block.visualPlaceholder}
                            </p>
                          </div>
                        );
                      }
                      if (block.type === "chart") {
                        return (
                          <div
                            key={block.id}
                            className="mb-4 p-4 border-2 border-dashed rounded-lg bg-muted/50"
                          >
                            <p className="text-sm text-muted-foreground">
                              Chart: {block.visualPlaceholder}
                            </p>
                          </div>
                        );
                      }
                      if (block.type === "image") {
                        return (
                          <div
                            key={block.id}
                            className="mb-4 p-4 border-2 border-dashed rounded-lg bg-muted/50"
                          >
                            <p className="text-sm text-muted-foreground">
                              Image: {block.visualPlaceholder} {block.optional && "(optional)"}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="placeholders">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle>Dynamic Fields</CardTitle>
                      <CardDescription>
                        Form fields that will be generated
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-3">
                          {template.placeholders_schema.map((field) => (
                            <div
                              key={field.key}
                              className="p-3 rounded-lg border bg-card"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{field.label}</span>
                                <Badge variant="secondary">{field.type}</Badge>
                              </div>
                              <code className="text-xs text-muted-foreground font-mono">
                                {`{{${field.key}}}`}
                              </code>
                              {field.required && (
                                <Badge variant="destructive" className="ml-2 text-xs">
                                  Required
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle>Visual Placeholders</CardTitle>
                      <CardDescription>
                        Charts, tables, and images
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-3">
                          {template.visual_placeholders.map((vp) => (
                            <div
                              key={vp.id}
                              className="p-3 rounded-lg border bg-card"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{vp.name}</span>
                                <Badge variant="secondary">{vp.type}</Badge>
                              </div>
                              {vp.source && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Source: {vp.source}
                                </p>
                              )}
                              {vp.chartType && (
                                <p className="text-xs text-muted-foreground">
                                  Chart type: {vp.chartType}
                                </p>
                              )}
                              {vp.optional && (
                                <Badge variant="outline" className="mt-1 text-xs">
                                  Optional
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-0 shadow-sm mt-4">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                      Validation Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2 md:grid-cols-3">
                      <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700">
                        <p className="text-sm font-medium">All mandatory sections included</p>
                      </div>
                      <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700">
                        <p className="text-sm font-medium">
                          {template.placeholders_schema.length} placeholders defined
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700">
                        <p className="text-sm font-medium">
                          {template.visual_placeholders.length} visual elements
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="fixed">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle>Standard Template Sections</CardTitle>
                    <CardDescription>
                      These sections are automatically appended to all proposals using this template.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6">
                      {[
                        "Assumptions", "Change Management", "Process", 
                        "Classification", "Constraints", "Project Governance", 
                        "Cadence", "Reporting", "Decision Rights", 
                        "Risk & Issue Management", "Compliance & Access", "Roles in Governance"
                      ].map((section) => (
                        <div key={section} className="space-y-2">
                          <Label>{section}</Label>
                          <Textarea
                            value={(template.fixed_sections || {})[section] || ""}
                            onChange={(e) => {
                              const newFixed = { ...(template.fixed_sections || {}), [section]: e.target.value };
                              setTemplate({ ...template, fixed_sections: newFixed });
                            }}
                            placeholder={`Standard content for ${section}...`}
                            rows={3}
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
