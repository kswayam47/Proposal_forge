"use client";

import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MANDATORY_SECTIONS } from "@/lib/template-generator";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

const PROPOSAL_TYPES = [
  "Software Development",
  "Consulting Services",
  "Marketing Campaign",
  "IT Infrastructure",
  "Design Services",
  "Training & Education",
  "Managed Services",
  "Custom Project",
];

export default function NewTemplatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    proposalType: "",
    content: "",
    tags: [] as string[],
  });
  const [tagInput, setTagInput] = useState("");

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.proposalType) {
      toast.error("Please fill in required fields");
      return;
    }

    setLoading(true);

    try {
      const saveResponse = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          proposal_type: formData.proposalType,
          content: formData.content,
          sections: MANDATORY_SECTIONS,
          tags: formData.tags,
          status: "draft",
        }),
      });

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save template");
      }

      const { template } = await saveResponse.json();
      toast.success("Template created!");
      router.push(`/templates/${template.id}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create template";
      toast.error(errorMessage);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="p-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/templates">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">New Template</h1>
            <p className="text-muted-foreground mt-1">
              Create a new proposal template
            </p>
          </div>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Template Details
            </CardTitle>
            <CardDescription>
              Fill in the details for your new template
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="manual-name">Template Name *</Label>
                <Input
                  id="manual-name"
                  placeholder="e.g., Marketing Services Agreement"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-type">Proposal Type *</Label>
                <Select
                  value={formData.proposalType}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, proposalType: value }))
                  }
                >
                  <SelectTrigger id="manual-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPOSAL_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="manual-description">Description</Label>
              <Textarea
                id="manual-description"
                placeholder="What is this template for?"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="manual-content">Template Content (Markdown)</Label>
              <Textarea
                id="manual-content"
                placeholder="# Introduction\n\nYour content here..."
                value={formData.content}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, content: e.target.value }))
                }
                rows={10}
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                />
                <Button type="button" variant="outline" onClick={handleAddTag}>
                  Add
                </Button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <Link href="/templates">
                <Button variant="outline">Cancel</Button>
              </Link>
              <Button onClick={handleCreate} disabled={loading} className="gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Template
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
