"use client";

import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { supabase, type OrganizationSettings } from "@/lib/supabase";
import { toast } from "sonner";
import { Save, Loader2, Building2, Palette, Type } from "lucide-react";

export default function SettingsPage() {
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    const { data, error } = await supabase
      .from("organization_settings")
      .select("*")
      .limit(1)
      .single();

    if (error) {
      const { data: newData } = await supabase
        .from("organization_settings")
        .insert({ name: "My Organization" })
        .select()
        .single();
      setSettings(newData);
    } else {
      setSettings(data);
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!settings) return;
    setSaving(true);

    const { error } = await supabase
      .from("organization_settings")
      .update({
        name: settings.name,
        logo_url: settings.logo_url,
        primary_color: settings.primary_color,
        secondary_color: settings.secondary_color,
        font_family: settings.font_family,
        footer_text: settings.footer_text,
        updated_at: new Date().toISOString(),
      })
      .eq("id", settings.id);

    if (error) {
      toast.error("Failed to save settings");
    } else {
      toast.success("Settings saved");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (!settings) return null;

  return (
    <AppShell>
      <div className="p-8 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground mt-1">
              Manage your organization branding and preferences
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>

        <div className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organization
              </CardTitle>
              <CardDescription>
                Basic organization information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Organization Name</Label>
                <Input
                  id="name"
                  value={settings.name}
                  onChange={(e) =>
                    setSettings({ ...settings, name: e.target.value })
                  }
                  placeholder="Enter organization name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo">Logo URL</Label>
                <Input
                  id="logo"
                  value={settings.logo_url || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, logo_url: e.target.value })
                  }
                  placeholder="https://example.com/logo.png"
                />
                <p className="text-xs text-muted-foreground">
                  Enter a URL to your organization logo
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="footer">Footer Text</Label>
                <Textarea
                  id="footer"
                  value={settings.footer_text}
                  onChange={(e) =>
                    setSettings({ ...settings, footer_text: e.target.value })
                  }
                  placeholder="Confidential"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Branding Colors
              </CardTitle>
              <CardDescription>
                Customize colors for your proposals
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primary"
                      type="color"
                      value={settings.primary_color}
                      onChange={(e) =>
                        setSettings({ ...settings, primary_color: e.target.value })
                      }
                      className="w-14 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={settings.primary_color}
                      onChange={(e) =>
                        setSettings({ ...settings, primary_color: e.target.value })
                      }
                      placeholder="#0066cc"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondary">Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondary"
                      type="color"
                      value={settings.secondary_color}
                      onChange={(e) =>
                        setSettings({ ...settings, secondary_color: e.target.value })
                      }
                      className="w-14 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={settings.secondary_color}
                      onChange={(e) =>
                        setSettings({ ...settings, secondary_color: e.target.value })
                      }
                      placeholder="#333333"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border">
                <p className="text-sm text-muted-foreground mb-3">Preview</p>
                <div className="flex gap-4">
                  <div
                    className="w-16 h-16 rounded-lg"
                    style={{ backgroundColor: settings.primary_color }}
                  />
                  <div
                    className="w-16 h-16 rounded-lg"
                    style={{ backgroundColor: settings.secondary_color }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5" />
                Typography
              </CardTitle>
              <CardDescription>
                Font settings for proposals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="font">Font Family</Label>
                <Input
                  id="font"
                  value={settings.font_family}
                  onChange={(e) =>
                    setSettings({ ...settings, font_family: e.target.value })
                  }
                  placeholder="Inter"
                />
                <p className="text-xs text-muted-foreground">
                  Enter a font family name (must be available on the system)
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
