import { v4 as uuidv4 } from 'uuid';
import type { ContentBlock, PlaceholderField, VisualPlaceholder } from './supabase';

export const MANDATORY_SECTIONS = [
  'Cover Page',
  'Confidentiality Statement',
  'Executive Summary',
  'Client Background / Context',
  'Problem Statement',
  'Objectives',
  'Proposed Solution / Approach',
  'Scope of Work',
  'Deliverables',
  'Project Methodology',
  'Timeline & Milestones',
  'Pricing & Commercial Terms',
  'Assumptions & Dependencies',
  'Risks & Mitigation Plan',
  'Roles & Responsibilities',
  'Communication Plan',
  'Quality Assurance & Testing Approach',
  'Support & Maintenance',
  'Why Choose Us / Differentiators',
  'Case Studies / Portfolio',
  'Terms & Conditions',
  'Next Steps',
  'Appendix',
];

export function generateTemplateContent(
  proposalType: string,
  industry: string,
  serviceDescription: string
): { content: ContentBlock[]; placeholders: PlaceholderField[]; visualPlaceholders: VisualPlaceholder[] } {
  const content: ContentBlock[] = [];
  const placeholders: PlaceholderField[] = [];
  const visualPlaceholders: VisualPlaceholder[] = [];

  placeholders.push(
    { key: 'client_name', label: 'Client Name', type: 'text', required: true },
    { key: 'client_industry', label: 'Client Industry', type: 'text', required: false },
    { key: 'proposal_date', label: 'Proposal Date', type: 'date', required: true },
    { key: 'validity_period', label: 'Validity Period (Days)', type: 'number', required: true, defaultValue: 30 },
    { key: 'project_duration', label: 'Project Duration', type: 'text', required: true },
    { key: 'your_company_name', label: 'Your Company Name', type: 'text', required: true },
    { key: 'contact_person', label: 'Contact Person', type: 'text', required: true },
    { key: 'contact_email', label: 'Contact Email', type: 'text', required: true },
    { key: 'contact_phone', label: 'Contact Phone', type: 'text', required: false }
  );

  content.push({
    id: uuidv4(),
    type: 'heading',
    level: 1,
    content: 'Cover Page',
  });
  content.push({
    id: uuidv4(),
    type: 'paragraph',
    content: `# {{your_company_name}}\n\n## ${proposalType} Proposal\n\nPrepared for: **{{client_name}}**\n\nDate: {{proposal_date}}\n\nValid until: {{validity_period}} days from proposal date`,
  });

  content.push({
    id: uuidv4(),
    type: 'heading',
    level: 1,
    content: 'Confidentiality Statement',
  });
  content.push({
    id: uuidv4(),
    type: 'paragraph',
    content: `This document and its contents are confidential and intended solely for {{client_name}}. This proposal contains proprietary information belonging to {{your_company_name}}. Unauthorized distribution, reproduction, or disclosure of this document is strictly prohibited. By accepting this proposal, the recipient agrees to maintain confidentiality of all information contained herein.`,
  });

  content.push({
    id: uuidv4(),
    type: 'heading',
    level: 1,
    content: 'Executive Summary',
  });
  placeholders.push({ key: 'executive_summary', label: 'Executive Summary', type: 'textarea', required: true });
  content.push({
    id: uuidv4(),
    type: 'paragraph',
    content: `{{executive_summary}}`,
  });

  content.push({
    id: uuidv4(),
    type: 'heading',
    level: 1,
    content: 'Client Background / Context',
  });
  placeholders.push({ key: 'client_background', label: 'Client Background', type: 'textarea', required: true });
  content.push({
    id: uuidv4(),
    type: 'paragraph',
    content: `{{client_background}}`,
  });

  content.push({
    id: uuidv4(),
    type: 'heading',
    level: 1,
    content: 'Problem Statement',
  });
  placeholders.push({ key: 'problem_statement', label: 'Problem Statement', type: 'textarea', required: true });
  content.push({
    id: uuidv4(),
    type: 'paragraph',
    content: `{{problem_statement}}`,
  });

  content.push({
    id: uuidv4(),
    type: 'heading',
    level: 1,
    content: 'Objectives',
  });
  placeholders.push({
    key: 'objectives',
    label: 'Objectives',
    type: 'list',
    required: true,
    columns: [{ key: 'objective', label: 'Objective', type: 'text' }],
  });
  content.push({
    id: uuidv4(),
    type: 'list',
    content: '',
    placeholder: 'objectives',
  });

  content.push({
    id: uuidv4(),
    type: 'heading',
    level: 1,
    content: 'Proposed Solution / Approach',
  });
  placeholders.push({ key: 'proposed_solution', label: 'Proposed Solution', type: 'textarea', required: true });
  content.push({
    id: uuidv4(),
    type: 'paragraph',
    content: `{{proposed_solution}}`,
  });

  content.push({
    id: uuidv4(),
    type: 'heading',
    level: 1,
    content: 'Scope of Work',
  });
  placeholders.push({ key: 'scope_of_work', label: 'Scope of Work', type: 'textarea', required: true });
  content.push({
    id: uuidv4(),
    type: 'paragraph',
    content: `{{scope_of_work}}`,
  });
  placeholders.push({ key: 'exclusions', label: 'Exclusions (Out of Scope)', type: 'textarea', required: false });
  content.push({
    id: uuidv4(),
    type: 'paragraph',
    content: `**Out of Scope:**\n{{exclusions}}`,
  });

  content.push({
    id: uuidv4(),
    type: 'heading',
    level: 1,
    content: 'Deliverables',
  });
  placeholders.push({
    key: 'deliverables',
    label: 'Deliverables',
    type: 'table',
    required: true,
    columns: [
      { key: 'deliverable', label: 'Deliverable', type: 'text' },
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'timeline', label: 'Timeline', type: 'text' },
    ],
  });
  visualPlaceholders.push({
    id: uuidv4(),
    type: 'table',
    name: 'DeliverablesTable',
    source: 'deliverables',
  });
  content.push({
    id: uuidv4(),
    type: 'table',
    content: '',
    visualPlaceholder: 'DeliverablesTable',
  });

  content.push({
    id: uuidv4(),
    type: 'heading',
    level: 1,
    content: 'Project Methodology',
  });
  placeholders.push({ key: 'methodology', label: 'Project Methodology', type: 'textarea', required: true });
  content.push({
    id: uuidv4(),
    type: 'paragraph',
    content: `{{methodology}}`,
  });

  content.push({
    id: uuidv4(),
    type: 'heading',
    level: 1,
    content: 'Timeline & Milestones',
  });
  placeholders.push({
    key: 'milestones',
    label: 'Milestones',
    type: 'table',
    required: true,
    columns: [
      { key: 'milestone', label: 'Milestone', type: 'text' },
      { key: 'start_date', label: 'Start Date', type: 'date' },
      { key: 'end_date', label: 'End Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'text' },
    ],
  });
  visualPlaceholders.push({
    id: uuidv4(),
    type: 'table',
    name: 'MilestonesTable',
    source: 'milestones',
  });
  content.push({
    id: uuidv4(),
    type: 'table',
    content: '',
    visualPlaceholder: 'MilestonesTable',
  });
  visualPlaceholders.push({
    id: uuidv4(),
    type: 'chart',
    name: 'TimelineChart',
    source: 'milestones',
    chartType: 'bar',
  });
  content.push({
    id: uuidv4(),
    type: 'chart',
    content: '',
    visualPlaceholder: 'TimelineChart',
  });

  content.push({
    id: uuidv4(),
    type: 'heading',
    level: 1,
    content: 'Pricing & Commercial Terms',
  });
  placeholders.push({
    key: 'pricing_items',
    label: 'Pricing Items',
    type: 'table',
    required: true,
    columns: [
      { key: 'item', label: 'Item', type: 'text' },
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'quantity', label: 'Quantity', type: 'number' },
      { key: 'unit_price', label: 'Unit Price', type: 'currency' },
      { key: 'total', label: 'Total', type: 'currency' },
    ],
  });
  visualPlaceholders.push({
    id: uuidv4(),
    type: 'table',
    name: 'PricingTable',
    source: 'pricing_items',
  });
  content.push({
    id: uuidv4(),
    type: 'table',
    content: '',
    visualPlaceholder: 'PricingTable',
  });
  visualPlaceholders.push({
    id: uuidv4(),
    type: 'chart',
    name: 'CostDistribution',
    source: 'pricing_items',
    chartType: 'pie',
  });
  content.push({
    id: uuidv4(),
    type: 'chart',
    content: '',
    visualPlaceholder: 'CostDistribution',
  });
  placeholders.push({ key: 'payment_terms', label: 'Payment Terms', type: 'textarea', required: true });
  content.push({
    id: uuidv4(),
    type: 'paragraph',
    content: `**Payment Terms:**\n{{payment_terms}}`,
  });

  content.push({
    id: uuidv4(),
    type: 'heading',
    level: 1,
    content: 'Assumptions & Dependencies',
  });
  placeholders.push({ key: 'assumptions', label: 'Assumptions', type: 'textarea', required: true });
  placeholders.push({ key: 'dependencies', label: 'Dependencies', type: 'textarea', required: false });
  content.push({
    id: uuidv4(),
    type: 'paragraph',
    content: `**Assumptions:**\n{{assumptions}}\n\n**Dependencies:**\n{{dependencies}}`,
  });

  content.push({
    id: uuidv4(),
    type: 'heading',
    level: 1,
    content: 'Risks & Mitigation Plan',
  });
  placeholders.push({
    key: 'risks',
    label: 'Risks',
    type: 'table',
    required: true,
    columns: [
      { key: 'risk', label: 'Risk', type: 'text' },
      { key: 'impact', label: 'Impact', type: 'select' },
      { key: 'probability', label: 'Probability', type: 'select' },
      { key: 'mitigation', label: 'Mitigation Strategy', type: 'text' },
    ],
  });
  visualPlaceholders.push({
    id: uuidv4(),
    type: 'table',
    name: 'RisksTable',
    source: 'risks',
  });
  content.push({
    id: uuidv4(),
    type: 'table',
    content: '',
    visualPlaceholder: 'RisksTable',
  });

  content.push({
    id: uuidv4(),
    type: 'heading',
    level: 1,
    content: 'Roles & Responsibilities',
  });
  placeholders.push({
    key: 'team_roles',
    label: 'Team Roles',
    type: 'table',
    required: true,
    columns: [
      { key: 'role', label: 'Role', type: 'text' },
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'responsibilities', label: 'Responsibilities', type: 'text' },
    ],
  });
  visualPlaceholders.push({
    id: uuidv4(),
    type: 'table',
    name: 'TeamRolesTable',
    source: 'team_roles',
  });
  content.push({
    id: uuidv4(),
    type: 'table',
    content: '',
    visualPlaceholder: 'TeamRolesTable',
  });

  content.push({
    id: uuidv4(),
    type: 'heading',
    level: 1,
    content: 'Communication Plan',
  });
  placeholders.push({ key: 'communication_plan', label: 'Communication Plan', type: 'textarea', required: true });
  content.push({
    id: uuidv4(),
    type: 'paragraph',
    content: `{{communication_plan}}`,
  });

  content.push({
    id: uuidv4(),
    type: 'heading',
    level: 1,
    content: 'Quality Assurance & Testing Approach',
  });
  placeholders.push({ key: 'qa_approach', label: 'QA & Testing Approach', type: 'textarea', required: true });
  content.push({
    id: uuidv4(),
    type: 'paragraph',
    content: `{{qa_approach}}`,
  });

  content.push({
    id: uuidv4(),
    type: 'heading',
    level: 1,
    content: 'Support & Maintenance',
  });
  placeholders.push({
    key: 'include_support',
    label: 'Include Support & Maintenance?',
    type: 'select',
    required: true,
    options: ['Yes', 'No'],
    defaultValue: 'Yes',
  });
  placeholders.push({
    key: 'support_details',
    label: 'Support Details',
    type: 'textarea',
    required: false,
    conditional: { field: 'include_support', value: 'Yes' },
  });
  placeholders.push({
    key: 'sla_terms',
    label: 'SLA Terms',
    type: 'textarea',
    required: false,
    conditional: { field: 'include_support', value: 'Yes' },
  });
  content.push({
    id: uuidv4(),
    type: 'paragraph',
    content: `{{support_details}}\n\n**Service Level Agreement:**\n{{sla_terms}}`,
  });

  content.push({
    id: uuidv4(),
    type: 'heading',
    level: 1,
    content: 'Why Choose Us / Differentiators',
  });
  placeholders.push({ key: 'differentiators', label: 'Why Choose Us', type: 'textarea', required: true });
  content.push({
    id: uuidv4(),
    type: 'paragraph',
    content: `{{differentiators}}`,
  });

  content.push({
    id: uuidv4(),
    type: 'heading',
    level: 1,
    content: 'Case Studies / Portfolio',
  });
  placeholders.push({ key: 'case_studies', label: 'Case Studies', type: 'textarea', required: false });
  content.push({
    id: uuidv4(),
    type: 'paragraph',
    content: `{{case_studies}}`,
  });
  visualPlaceholders.push({
    id: uuidv4(),
    type: 'image',
    name: 'PortfolioImage',
    optional: true,
  });
  content.push({
    id: uuidv4(),
    type: 'image',
    content: '',
    visualPlaceholder: 'PortfolioImage',
    optional: true,
  });

  content.push({
    id: uuidv4(),
    type: 'heading',
    level: 1,
    content: 'Terms & Conditions',
  });
  placeholders.push({ key: 'terms_conditions', label: 'Terms & Conditions', type: 'textarea', required: true });
  content.push({
    id: uuidv4(),
    type: 'paragraph',
    content: `{{terms_conditions}}`,
  });

  content.push({
    id: uuidv4(),
    type: 'heading',
    level: 1,
    content: 'Next Steps',
  });
  placeholders.push({ key: 'next_steps', label: 'Next Steps', type: 'textarea', required: true });
  content.push({
    id: uuidv4(),
    type: 'paragraph',
    content: `{{next_steps}}\n\nFor questions or to proceed, please contact:\n\n**{{contact_person}}**\nEmail: {{contact_email}}\nPhone: {{contact_phone}}`,
  });

  content.push({
    id: uuidv4(),
    type: 'heading',
    level: 1,
    content: 'Appendix',
  });
  placeholders.push({ key: 'appendix', label: 'Appendix Content', type: 'textarea', required: false });
  content.push({
    id: uuidv4(),
    type: 'paragraph',
    content: `{{appendix}}`,
    optional: true,
  });

  return { content, placeholders, visualPlaceholders };
}

export function extractHeadings(content: ContentBlock[], filledData?: Record<string, unknown>): { id: string; title: string; level: number }[] {
  const headings: { id: string; title: string; level: number }[] = [];
  
  const hasDeliveryPlanHeading = content.some(
    (block) => block.type === 'heading' && typeof block.content === 'string' && block.content.toLowerCase().includes('delivery plan')
  );
  
  content.forEach((block) => {
    if (block.type === 'heading' && typeof block.content === 'string' && block.content.trim()) {
      headings.push({
        id: block.id,
        title: block.content,
        level: block.level || 1,
      });
    }
    
    if ((block.visualPlaceholder === 'delivery_plan' || block.visualPlaceholder === 'delivery_phases_view') && !hasDeliveryPlanHeading) {
      const dynamicTitle = filledData?.delivery_plan_title as string;
      headings.push({
        id: block.id,
        title: dynamicTitle || 'Delivery Plan (Phases & Timelines)',
        level: 1,
      });
    }
    
    if (block.visualPlaceholder?.endsWith('_plan_section') && block.visualPlaceholder !== 'delivery_plan') {
      const baseKey = block.visualPlaceholder.replace('_plan_section', '');
      const titleKey = `${baseKey}_title`;
      const dynamicTitle = filledData?.[titleKey] as string;
      const sectionName = baseKey.replace(/_\d+$/, '').replace(/_/g, ' ');
      headings.push({
        id: block.id,
        title: dynamicTitle || (sectionName.charAt(0).toUpperCase() + sectionName.slice(1)),
        level: 1,
      });
    }
  });
  
  return headings;
}

export function renderTemplate(
  content: ContentBlock[],
  filledData: Record<string, unknown>,
  visualPlaceholders: VisualPlaceholder[]
): ContentBlock[] {
  return content.map((block) => {
    const rendered = { ...block };

    if (block.content) {
      let text = block.content;
      const placeholderRegex = /\{\{(\w+)\}\}/g;
      text = text.replace(placeholderRegex, (match, key) => {
        const value = filledData[key];
        if (value === undefined || value === null || value === '') {
          return block.optional ? '' : match;
        }
        return String(value);
      });
      rendered.content = text;
    }

    if (block.visualPlaceholder) {
      const vp = visualPlaceholders.find((v) => v.name === block.visualPlaceholder);
      if (vp) {
        if (vp.source && filledData[vp.source]) {
          rendered.data = filledData[vp.source];
        } else if (filledData[vp.name]) {
          rendered.data = filledData[vp.name];
        } else if (filledData[block.visualPlaceholder]) {
          rendered.data = filledData[block.visualPlaceholder];
        }
      }
    }

    if (block.placeholder) {
      rendered.items = filledData[block.placeholder] as string[] | undefined;
    }

    return rendered;
  });
}
