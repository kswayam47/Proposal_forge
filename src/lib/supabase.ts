import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Template = {
  id: string;
  name: string;
  description: string | null;
  proposal_type: string;
  industry: string | null;
  tone: string;
  content: ContentBlock[];
  placeholders_schema: PlaceholderField[];
  visual_placeholders: VisualPlaceholder[];
  status: 'draft' | 'review' | 'approved' | 'published';
  tags: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
  version: string;
  author_name: string | null;
  fixed_sections?: Record<string, any>;
  is_permanent?: boolean;
};

export type Proposal = {
  id: string;
  title: string;
  template_id: string | null;
  filled_data: Record<string, unknown>;
  rendered_content: ContentBlock[] | null;
  status: 'draft' | 'review' | 'approved' | 'finalized';
  client_name: string | null;
  subtitle: string | null;
  client_industry: string | null;
  region: string | null;
  validity_period: string | null;
  start_date: string | null;
  author_name: string | null;
  is_locked: boolean;
  version: number;
  version_label: string | null;
  version_history: VersionEntry[];
  signoffs: Record<string, SignOff>;
  parent_id: string | null;
  export_urls: Record<string, string>;
  readiness_score: number;
  improvement_checklist: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
  last_saved_at: string;
  template?: Template;
  header_image_url?: string | null;
  graph_color_palette?: string;
};

export type SignOff = {
  status: 'pending' | 'approved' | 'rejected';
  signed_by: string | null;
  signed_at: string | null;
  comments: string | null;
};

export type Comment = {
  id: string;
  proposal_id: string;
  section_id: string | null;
  content: string;
  author: string;
  status: 'open' | 'resolved';
  created_at: string;
};

export type AuditLog = {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor: string;
  details: Record<string, unknown> | null;
  created_at: string;
};

export type OrganizationSettings = {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  font_family: string;
  footer_text: string;
  created_at: string;
  updated_at: string;
};

export type ContentBlock = {
  id: string;
  type: 'heading' | 'paragraph' | 'list' | 'table' | 'chart' | 'image' | 'pagebreak';
  level?: number;
  content: string;
  items?: string[];
  data?: unknown;
  placeholder?: string;
  visualPlaceholder?: string;
  optional?: boolean;
};

export type PlaceholderField = {
  key: string;
  label: string;
  type: 'text' | 'date' | 'number' | 'currency' | 'list' | 'table' | 'file' | 'select' | 'textarea';
  required: boolean;
  defaultValue?: unknown;
  options?: string[];
  columns?: { key: string; label: string; type: string }[];
  conditional?: { field: string; value: unknown };
};

export type VisualPlaceholder = {
  id: string;
  type: 'table' | 'chart' | 'image';
  name: string;
  source?: string;
  chartType?: 'bar' | 'line' | 'pie' | 'area';
  optional?: boolean;
  schema?: {
    columns: { key: string; label: string; type: 'string' | 'number' | 'currency' }[];
    description?: string;
    insights?: string; // AI generated insight about what to look for in this chart
  };
};

export type VersionEntry = {
  version: number;
  filled_data: Record<string, unknown>;
  saved_at: string;
  saved_by: string;
};

export type ProposalShare = {
  id: string;
  proposal_id: string;
  share_token: string;
  expires_at: string | null;
  password_hash: string | null;
  view_count: number;
  max_views: number | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  last_viewed_at: string | null;
};
